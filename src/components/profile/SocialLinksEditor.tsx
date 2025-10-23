import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";

interface SocialLinksEditorProps {
  socialLinks: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    github?: string;
  };
  onChange: (socialLinks: any) => void;
}

export const SocialLinksEditor = ({ socialLinks, onChange }: SocialLinksEditorProps) => {
  const handleChange = (platform: string, value: string) => {
    onChange({
      ...socialLinks,
      [platform]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Redes Sociales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={socialLinks.linkedin || ""}
              onChange={(e) => handleChange("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/tu-perfil"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={socialLinks.github || ""}
              onChange={(e) => handleChange("github", e.target.value)}
              placeholder="https://github.com/tu-usuario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter/X</Label>
            <Input
              id="twitter"
              value={socialLinks.twitter || ""}
              onChange={(e) => handleChange("twitter", e.target.value)}
              placeholder="https://twitter.com/tu-usuario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={socialLinks.instagram || ""}
              onChange={(e) => handleChange("instagram", e.target.value)}
              placeholder="https://instagram.com/tu-usuario"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={socialLinks.facebook || ""}
              onChange={(e) => handleChange("facebook", e.target.value)}
              placeholder="https://facebook.com/tu-perfil"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              value={socialLinks.tiktok || ""}
              onChange={(e) => handleChange("tiktok", e.target.value)}
              placeholder="https://tiktok.com/@tu-usuario"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};