export type Profile = {
  id: number;
  name: string;
  name_accent: string;
  title: string;
  tagline: string;
  photo_url: string;
  about: string;
  github: string;
  linkedin: string;
  initials?: string;
  location?: string;
  location_url?: string;
  public_email?: string;
  phone?: string;
  resume_url?: string;
};

export type Education = {
  id: number;
  school: string;
  degree: string;
  dates: string;
  place: string;
  sort: number;
};

export type Skill = {
  id: number;
  name: string;
  icon: string;
  sort: number;
};

export type Project = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  repo: string;
  live: string;
  image_url: string;
  tags: string[];
  categories: string[];
  date: string;
  app_link: string;
  app_note: string;
  sort: number;
  featured?: boolean;
  published?: boolean;
  views?: number;
  updated_at?: string;
};

export type Message = {
  id: number;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type Contributions = {
  total: number;
  weeks: [string, number, number][][]; // [date, count, level 0-4]
};
