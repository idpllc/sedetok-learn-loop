// Closed registry of lucide icons that the AI can suggest for cards. Static
// imports so Vite bundles them and we never hit a runtime import miss.
import {
  Sparkles, Lightbulb, BookOpen, Beaker, Atom, FlaskConical, Microscope,
  Leaf, Sprout, TreePine, Sun, Moon, Cloud, Droplet, Flame, Mountain, Globe,
  Heart, Brain, Eye, Hand, Users, User, GraduationCap, School, Building2,
  Calculator, Compass, Ruler, Pencil, Palette, Music, Camera, Film,
  Code, Cpu, Database, Network, Rocket, Target, Trophy, Award, Star,
  Map, Flag, Clock, Calendar, Zap, Shield, Key, Lock, Search, Library,
  Dna, Activity, Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SLIDE_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, lightbulb: Lightbulb, book: BookOpen, beaker: Beaker,
  atom: Atom, flask: FlaskConical, microscope: Microscope, leaf: Leaf,
  sprout: Sprout, tree: TreePine, sun: Sun, moon: Moon, cloud: Cloud,
  droplet: Droplet, flame: Flame, mountain: Mountain, globe: Globe,
  heart: Heart, brain: Brain, eye: Eye, hand: Hand, users: Users,
  user: User, graduation: GraduationCap, school: School, building: Building2,
  calculator: Calculator, compass: Compass, ruler: Ruler, pencil: Pencil,
  palette: Palette, music: Music, camera: Camera, film: Film, code: Code,
  cpu: Cpu, database: Database, network: Network, rocket: Rocket,
  target: Target, trophy: Trophy, award: Award, star: Star, map: Map,
  flag: Flag, clock: Clock, calendar: Calendar, zap: Zap, shield: Shield,
  key: Key, lock: Lock, search: Search, library: Library, dna: Dna,
  activity: Activity, wind: Wind,
};

export const ICON_NAMES = Object.keys(SLIDE_ICONS);

export const getSlideIcon = (name?: string | null): LucideIcon =>
  (name && SLIDE_ICONS[name.toLowerCase()]) || Sparkles;
