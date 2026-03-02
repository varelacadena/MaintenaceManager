import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, FileText, Image, Link, ExternalLink, X } from "lucide-react";
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

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  return null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  return null;
}

export default function ResourceCard({ resource }: { resource: Resource }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const catStyle = resource.category ? getCategoryStyle(resource.category.color) : null;
  const thumb = resource.type === "video" ? getYoutubeThumbnail(resource.url) : null;
  const embedUrl = resource.type === "video" ? getYoutubeEmbedUrl(resource.url) : null;

  function handleClick() {
    if (resource.type === "video") setVideoOpen(true);
    else if (resource.type === "image") setImageOpen(true);
    else if (resource.type === "document" || resource.type === "link") window.open(resource.url, "_blank", "noopener");
  }

  return (
    <>
      <Card
        className="cursor-pointer hover-elevate transition-all"
        onClick={handleClick}
        data-testid={`card-resource-${resource.id}`}
      >
        {thumb && (
          <div className="relative h-28 overflow-hidden rounded-t-md bg-muted">
            <img src={thumb} alt={resource.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/60 rounded-full p-2.5">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
          </div>
        )}
        {resource.type === "image" && resource.url && (
          <div className="relative h-28 overflow-hidden rounded-t-md bg-muted">
            <img src={resource.url} alt={resource.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            {resource.type === "document" && <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
            {resource.type === "link" && <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
            {resource.type === "video" && !thumb && <Play className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
            {resource.type === "image" && !resource.url && <Image className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight line-clamp-2" data-testid={`text-resource-title-${resource.id}`}>
                {resource.title}
              </p>
              {resource.fileName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{resource.fileName}</p>
              )}
            </div>
          </div>
          {resource.category && catStyle && (
            <Badge style={catStyle} className="text-xs" data-testid={`badge-resource-category-${resource.id}`}>
              {resource.category.name}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* YouTube Video Modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-base">{resource.title}</DialogTitle>
          </DialogHeader>
          {embedUrl && (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                title={resource.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="p-2">
            <DialogTitle className="text-base">{resource.title}</DialogTitle>
          </DialogHeader>
          <img
            src={resource.url}
            alt={resource.title}
            className="w-full h-auto max-h-[75vh] object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
