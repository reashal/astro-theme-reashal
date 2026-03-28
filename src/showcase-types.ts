export interface Card {
  title: string;
  description: string;
  link?: string;
  image?: string;
  imageMode: 'text-only' | 'icon-simple' | 'app-card' | 'product-card';
  specs?: string[];
}

export interface Section {
  title: string;
  cards: Card[];
}

export interface ShowcaseConfig {
  title: string;
  description: string;
  showFooter?: boolean;
  intro?: string[];
  sections: Section[];
  enableComments?: boolean;
}
