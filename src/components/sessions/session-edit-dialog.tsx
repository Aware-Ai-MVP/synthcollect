/**
 * Session edit dialog component
 * @filepath src/components/sessions/session-edit-dialog.tsx
 */

import { useState } from 'react';
import { Session } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SessionEditDialogProps {
  session: Session;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function SessionEditDialog({ session, open, onOpenChange, onSave }: SessionEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: session.name,
    description: session.description || '',
  });
  
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Session name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }
      
      toast.success('Session updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update session');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit Session</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Update the session details
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="dark:text-gray-200">
              Session Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Diverse Lighting Conditions"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description" className="dark:text-gray-200">
              Description <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the purpose of this session..."
              rows={3}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder:text-gray-400"
            />
          </div>
          
          <div className="grid gap-2">
            <Label className="text-sm text-gray-500 dark:text-gray-400">Session Info</Label>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>Created: {new Date(session.created_at).toLocaleDateString()}</p>
              <p>Images: {session.image_count}</p>
              <p>Status: {session.status}</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}