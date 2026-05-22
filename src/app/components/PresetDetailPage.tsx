import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Star, User, Calendar, Trash2, Edit } from 'lucide-react';
import { api, Preset, Comment } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback } from './ui/avatar';

export function PresetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    if (id) {
      loadPreset();
    }
  }, [id]);

  const loadPreset = async () => {
    try {
      setLoading(true);
      const data = await api.getPreset(id!);
      setPreset(data.preset);
      setComments(data.comments);
    } catch (error) {
      console.error('Error loading preset:', error);
      toast.error('Failed to load preset');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast.error('Please sign in to rate presets');
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) return;

      const data = await api.ratePreset(token, id!, rating);
      setUserRating(rating);
      if (preset) {
        setPreset({
          ...preset,
          rating: data.rating,
          ratingCount: data.ratingCount,
        });
      }
      toast.success('Rating submitted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to rate preset');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) return;

      const data = await api.addComment(token, id!, commentText);
      setComments([...comments, data.comment]);
      setCommentText('');
      toast.success('Comment added!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      await api.deletePreset(token, id!);
      toast.success('Preset deleted');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete preset');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Preset not found</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === preset.userId;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{preset.name}</h1>
            <Link
              to={`/profile/${preset.userId}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="w-4 h-4" />
              <span>{preset.userName}</span>
            </Link>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Rating */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">
                    {preset.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({preset.ratingCount} ratings)
                  </span>
                </div>
                {user && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleRate(rating)}
                        onMouseEnter={() => setHoveredRating(rating)}
                        onMouseLeave={() => setHoveredRating(0)}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            rating <= (hoveredRating || userRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {preset.tags && preset.tags.length > 0 && (
                <div className="flex gap-2">
                  {preset.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Description</h3>
              <p className="text-muted-foreground">{preset.description}</p>
            </div>

            {preset.guitarModel && (
              <div>
                <h3 className="font-medium mb-1">Guitar Model</h3>
                <p className="text-muted-foreground">{preset.guitarModel}</p>
              </div>
            )}

            {preset.settings && Object.keys(preset.settings).length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Settings</h3>
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(preset.settings, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Created {new Date(preset.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <form onSubmit={handleAddComment} className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                />
                <Button type="submit">Post Comment</Button>
              </form>
            )}

            {comments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {comment.userName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
