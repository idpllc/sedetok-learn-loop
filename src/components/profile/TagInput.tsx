import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  fieldName: "areas_interes" | "temas_favoritos" | "profesiones_de_interes" | "habilidades_a_desarrollar";
}

export const TagInput = ({ value, onChange, placeholder, fieldName }: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue.trim()) {
        setSuggestions([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(fieldName)
        .not(fieldName, "is", null);

      if (error || !data) return;

      // Flatten and get unique tags
      const allTags = new Set<string>();
      data.forEach((profile) => {
        const tags = profile[fieldName];
        if (Array.isArray(tags)) {
          tags.forEach((tag: string) => {
            if (tag && typeof tag === "string" && tag.toLowerCase().includes(inputValue.toLowerCase())) {
              allTags.add(tag);
            }
          });
        }
      });

      // Filter out already selected tags
      const filtered = Array.from(allTags).filter((tag) => !value.includes(tag));
      setSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, fieldName, value]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
      setInputValue("");
      setOpen(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
          />
        </PopoverTrigger>
        <PopoverContent className="p-0 w-full bg-popover z-50" align="start">
          <Command>
            <CommandList>
              <CommandEmpty>No se encontraron sugerencias</CommandEmpty>
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => addTag(suggestion)}
                    className="cursor-pointer"
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => removeTag(tag)}
          >
            {tag}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
      </div>
    </div>
  );
};
