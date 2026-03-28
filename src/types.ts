export interface PageConfig {
  title: string;
  description: string;
  path: string;
  type: 'moments' | 'category' | 'showcase' | 'external';
  icon: string;
  hiddenInAside?: boolean;
  isShowcaseParent?: boolean;
  enableComments?: boolean;
  dataSource: {
    type: 'file' | 'folder' | 'config' | 'none';
    path?: string;
    collectionKey?: string;
  };
}
