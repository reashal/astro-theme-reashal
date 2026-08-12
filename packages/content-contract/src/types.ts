export interface ContractIssue {
  readonly path: string;
  readonly message: string;
}

export interface ContractResult<T> {
  readonly value?: T;
  readonly issues: readonly ContractIssue[];
}
