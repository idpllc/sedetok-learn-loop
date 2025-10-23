import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, Instagram, Facebook, Github, Twitter } from "lucide-react";
import { SiTiktok } from "react-icons/si";

interface SocialLinksProps {
  socialLinks?: any;
}

export const SocialLinks = ({ socialLinks }: SocialLinksProps) => {
  if (!socialLinks || Object.values(socialLinks).every((v) => !v)) {
    return null;
  }

  const networks = [
    { key: "linkedin", icon: Linkedin, label: "LinkedIn", color: "text-blue-600" },
    { key: "instagram", icon: Instagram, label: "Instagram", color: "text-pink-600" },
    { key: "facebook", icon: Facebook, label: "Facebook", color: "text-blue-500" },
    { key: "twitter", icon: Twitter, label: "Twitter", color: "text-sky-500" },
    { key: "tiktok", icon: SiTiktok, label: "TikTok", color: "text-black dark:text-white" },
    { key: "github", icon: Github, label: "GitHub", color: "text-gray-800 dark:text-gray-200" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌐 Redes Sociales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {networks.map(({ key, icon: Icon, label, color }) => {
            const url = socialLinks[key];
            if (!url) return null;
            
            return (
              <Button
                key={key}
                variant="outline"
                className="justify-start"
                asChild
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Icon className={`w-5 h-5 mr-2 ${color}`} />
                  {label}
                </a>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};