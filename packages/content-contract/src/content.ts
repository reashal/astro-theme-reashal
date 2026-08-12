export interface MomentContract {
  readonly id?: string;
  readonly date: string;
  readonly para?: readonly string[];
  readonly media?: readonly Record<string, unknown>[];
  readonly loc?: string;
  readonly music?: string;
}

export interface EssayContract {
  readonly title: string;
  readonly desc: string;
  readonly pubDate: string;
  readonly updatedDate?: string;
  readonly author?: string;
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly pinned?: boolean;
  readonly body: string;
}

export interface ImageContract {
  readonly path: string;
  readonly publicUrl: string;
}

export interface ShowcaseCardContract {
  readonly title: string;
  readonly description: string;
  readonly link?: string;
  readonly image?: string;
  readonly imageMode: "text-only" | "icon-simple" | "app-card" | "product-card";
  readonly specs?: readonly string[];
}
