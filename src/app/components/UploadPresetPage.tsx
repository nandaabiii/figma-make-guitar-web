import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

export function UploadPresetPage() {
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    guitarModel: '',
    tags: '',
    settings: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to upload presets');
      return;
    }

    setLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication error');
        return;
      }

      let settings = {};
      if (formData.settings.trim()) {
        try {
          settings = JSON.parse(formData.settings);
        } catch (error) {
          toast.error('Invalid JSON in settings field');
          setLoading(false);
          return;
        }
      }

      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const data = await api.createPreset(token, {
        name: formData.name,
        description: formData.description,
        guitarModel: formData.guitarModel,
        tags,
        settings,
      });

      toast.success('Preset uploaded successfully!');
      navigate(`/preset/${data.preset.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload preset');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground">
            Please sign in to upload presets
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-3xl">Upload Preset</CardTitle>
                <CardDescription>
                  Share your guitar preset with the community
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Preset Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Clean Jazz Tone"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your preset, how to use it, what it sounds like..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guitarModel">Guitar Model</Label>
                <Input
                  id="guitarModel"
                  type="text"
                  placeholder="e.g., Fender Stratocaster, Ibanez RG, etc."
                  value={formData.guitarModel}
                  onChange={(e) =>
                    setFormData({ ...formData, guitarModel: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  type="text"
                  placeholder="e.g., jazz, clean, reverb (comma separated)"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate tags with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings">Settings (JSON)</Label>
                <Textarea
                  id="settings"
                  placeholder='{"gain": 5, "tone": 7, "volume": 8}'
                  value={formData.settings}
                  onChange={(e) =>
                    setFormData({ ...formData, settings: e.target.value })
                  }
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Enter your preset settings as JSON
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Uploading...' : 'Upload Preset'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
