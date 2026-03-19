export interface MdDocument {
  id: string;
  title: string;
  currentContent: string | null;
  currentVersion: number;
  isShared: number;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  summaryJson: MdDocumentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface MdDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  changeNote: string | null;
  createdBy: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface MdDocumentSummary {
  keyPoints: string[];
  tableOfContents: { title: string; level: number }[];
  estimatedReadTime: number;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface SlideContent {
  title: string;
  content: string;
  isTitle?: boolean;
}
