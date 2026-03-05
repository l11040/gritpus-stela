export interface ProjectMember {
  id: string;
  role: string;
  user: { name: string; email: string };
}

export interface ProjectBoard {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  members: ProjectMember[];
  boards: ProjectBoard[];
}
