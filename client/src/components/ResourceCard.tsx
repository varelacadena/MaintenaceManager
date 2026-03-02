import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, FileText, Image, Link, ExternalLink, Edit, Trash2, ExternalLink as OpenIcon } from "lucide-react";
import { getCategoryStyle } from "@/lib/categoryColors";

type ResourceCategory = {
  id: string;
  name: string;
  color: string;
};

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "document" | "image" | "link";
  url: string;
  fileName: string | null;
  categoryId: string | null;
  category: ResourceCategory | null;
};

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getYoutubeThumbnail(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
}

interface ResourceCardProps {
  resource: Resource;
  onEdit?: () => void;
  onDelete?: () => void;
  linkedProperties?: string[];
}

export default function ResourceCard({ resource, onEdit, onDelete, linkedProperties }: ResourceCardProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const catStyle = resource.category ? getCategoryStyle(resource.category.color) : null;
  const thumb = resource.type === "video" ? getYoutubeThumbnail(resource.url) : null;
  const embedUrl = resource.type === "video" ? getYoutubeEmbedUrl(resource.url) : null;
  const hasAdminActions = !!(onEdit || onDelete);

  function handleClick() {
    if (resource.type === "video") {
      if (embedUrl) {
        setVideoOpen(true);
      } else {
        window.open(resource.url, "_blank", "noopener");
      }
    } else if (resource.type === "image") {
      setImageOpen(true);
    } else {
      window.open(resource.url, "_blank", "noopener");
    }
  }

  function handleAdminClick(e: React.MouseEvent, action: () => void) {
    e.stopPropagation();
    action();
  }

  return (
    <>
      <Card
        className="cursor-pointer hover-elevate transition-all flex flex-col"
        onClick={handleClick}
        data-testid={`card-resource-${resource.id}`}
      >
        {thumb && (
          <div className="relative h-28 overflow-hidden rounded-t-md bg-muted flex-shrink-0">
            <img src={thumb} alt={resource.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/60 rounded-full p-2.5">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
          </div>
        )}
        {resource.type === "image" && resource.url && (
          <div className="relative h-28 overflow-hidden rounded-t-md bg-muted flex-shrink-0">
            <img src={resource.url} alt={resource.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {resource.type === "document" && <FileText className="w-4 h-4 text-muted-foreground" />}
              {resource.type === "link" && <ExternalLink className="w-4 h-4 text-muted-foreground" />}
              {resource.type === "video" && !thumb && <Play className="w-4 h-4 text-muted-foreground" />}
              {resource.type === "image" && !resource.url && <Image className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight line-clamp-2" data-testid={`text-resource-title-${resource.id}`}>
                {resource.title}
              </p>
              {resource.fileName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{resource.fileName}</p>
              )}
              {resource.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>
              )}
            </div>
            {hasAdminActions && (
              <div className="flex gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {onEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={e => handleAdminClick(e, onEdit)}
                    data-testid={`button-edit-resource-${resource.id}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={e => handleAdminClick(e, onDelete)}
                    data-testid={`button-delete-resource-${resource.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {resource.category && catStyle && (
              <Badge style={catStyle} className="text-xs" data-testid={`badge-resource-category-${resource.id}`}>
                {resource.category.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs capitalize">
              {resource.type}
            </Badge>
          </div>
          {linkedProperties && linkedProperties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedProperties.map(name => (
                <span key={name} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* YouTube Video Modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-base pr-8">{resource.title}</DialogTitle>
          </DialogHeader>
          {embedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                title={resource.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <Play className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm mb-3">This video cannot be embedded.</p>
              <Button variant="outline" size="sm" onClick={() => window.open(resource.url, "_blank", "noopener")}>
                <OpenIcon className="w-3.5 h-3.5 mr-1.5" />
                Open video
              </Button>
            </div>
          )}
          {embedUrl && (
            <div className="p-3 flex justify-end border-t">
              <Button variant="ghost" size="sm" onClick={() => window.open(resource.url, "_blank", "noopener")}>
                <OpenIcon className="w-3.5 h-3.5 mr-1.5" />
                Open in new tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="p-2 pb-0">
            <DialogTitle className="text-base pr-8">{resource.title}</DialogTitle>
          </DialogHeader>
          <img
            src={resource.url}
            alt={resource.title}
            className="w-full h-auto max-h-[75vh] object-contain rounded-md mt-2"
          />
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => window.open(resource.url, "_blank", "noopener")}>
              <OpenIcon className="w-3.5 h-3.5 mr-1.5" />
              Open full size
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
